package az.planera.waitlist;

import az.planera.appointment.AppointmentChanged;
import az.planera.common.BusinessRuleException;
import az.planera.common.Messages;
import az.planera.common.NotFoundException;
import az.planera.config.TimeConfig;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.ServiceOffering;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.domain.WaitlistEntry;
import az.planera.domain.WaitlistEntryRepository;
import az.planera.mail.EmailMessage;
import az.planera.mail.EmailSender;
import az.planera.push.PushMessage;
import az.planera.push.PushService;
import az.planera.slot.SlotService;
import az.planera.waitlist.WaitlistDtos.JoinRequest;
import az.planera.waitlist.WaitlistDtos.WaitlistView;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Waitlist (#45): a customer joins for a day that has no free start left;
 * when an appointment of that provider on that day is cancelled, everyone
 * waiting gets an e-mail and a push with a link to the booking page, and
 * the entry is closed.
 */
@Service
@Transactional
public class WaitlistService {

    /** Open entries one customer may hold at a time. */
    static final int MAX_OPEN = 10;

    private static final Logger log = LoggerFactory.getLogger(WaitlistService.class);

    private final WaitlistEntryRepository entries;
    private final AppointmentRepository appointments;
    private final UserRepository users;
    private final SlotService slots;
    private final PushService push;
    private final EmailSender mail;
    private final Clock clock;
    private final String siteUrl;

    public WaitlistService(
            WaitlistEntryRepository entries,
            AppointmentRepository appointments,
            UserRepository users,
            SlotService slots,
            PushService push,
            EmailSender mail,
            Clock clock,
            @Value("${planera.mail.site-url:https://planera-az.vercel.app}") String siteUrl) {
        this.entries = entries;
        this.appointments = appointments;
        this.users = users;
        this.slots = slots;
        this.push = push;
        this.mail = mail;
        this.clock = clock;
        this.siteUrl = siteUrl.replaceAll("/$", "");
    }

    /** Idempotent: joining the same day twice keeps one entry. */
    public WaitlistView join(String email, JoinRequest request) {
        User user = user(email);
        ServiceOffering service = slots.activeService(request.slug(), request.serviceId());
        LocalDate today = LocalDate.now(clock.withZone(TimeConfig.BAKU));
        if (request.date().isBefore(today) || request.date().isAfter(today.plusDays(SlotService.HORIZON_DAYS))) {
            throw new BusinessRuleException(Messages.key("waitlist.outOfRange", SlotService.HORIZON_DAYS));
        }
        if (!slots.freeStarts(service.getId(), request.date(), null).isEmpty()) {
            throw new BusinessRuleException(Messages.key("waitlist.notFull"));
        }
        List<WaitlistEntry> open = entries.findByUserIdAndNotifiedAtIsNullOrderByWantedDateAsc(user.getId());
        for (WaitlistEntry existing : open) {
            if (existing.getService().getId().equals(service.getId()) && existing.getWantedDate().equals(request.date())) {
                return view(existing);
            }
        }
        if (open.size() >= MAX_OPEN) {
            throw new BusinessRuleException(Messages.key("waitlist.limit", MAX_OPEN));
        }
        return view(entries.save(new WaitlistEntry(user, service, request.date())));
    }

    @Transactional(readOnly = true)
    public List<WaitlistView> mine(String email) {
        return entries.findByUserIdAndNotifiedAtIsNullOrderByWantedDateAsc(user(email).getId()).stream()
                .map(WaitlistService::view)
                .toList();
    }

    public void leave(String email, Long id) {
        WaitlistEntry entry = entries.findByIdAndUserId(id, user(email).getId())
                .orElseThrow(() -> new NotFoundException(Messages.key("waitlist.notFound", id)));
        entries.delete(entry);
    }

    /** A cancelled appointment frees time: tell everyone waiting for that provider and day. */
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAppointmentChanged(AppointmentChanged event) {
        if (event.kind() != AppointmentChanged.Kind.CANCELLED) {
            return;
        }
        appointments.findById(event.appointmentId()).ifPresent(this::notifyWaiting);
    }

    /** Package-private so the tests can drive it without an event; returns how many were told. */
    int notifyWaiting(Appointment cancelled) {
        LocalDate day = cancelled.getStartsAt().atZone(TimeConfig.BAKU).toLocalDate();
        int notified = 0;
        for (WaitlistEntry entry : entries.findByProviderIdAndWantedDateAndNotifiedAtIsNull(
                cancelled.getProvider().getId(), day)) {
            if (entry.getUser().getId().equals(cancelled.getCustomer().getId())) {
                continue;
            }
            User user = entry.getUser();
            Locale locale = user.getLocale();
            String path = "/book/" + entry.getProvider().getSlug()
                    + "?service=" + entry.getService().getId() + "&date=" + day;
            Object[] args = {
                user.getFullName(),
                entry.getProvider().getDisplayName(),
                entry.getService().getName(),
                day.toString(),
                siteUrl + path
            };
            try {
                mail.send(new EmailMessage(
                        user.getEmail(),
                        Messages.get(Messages.key("waitlist.subject", args), locale),
                        Messages.get(Messages.key("waitlist.body", args), locale)));
                push.sendToUser(user.getId(), new PushMessage(
                        Messages.get("waitlist.pushTitle", locale),
                        Messages.get(Messages.key("waitlist.pushBody", args), locale),
                        path,
                        "waitlist-" + entry.getId()));
            } catch (RuntimeException e) {
                log.warn("Waitlist notification for entry {} failed: {}", entry.getId(), e.getMessage());
            }
            entry.markNotified(clock.instant());
            notified++;
        }
        return notified;
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException(Messages.key("user.notFound")));
    }

    static WaitlistView view(WaitlistEntry e) {
        return new WaitlistView(
                e.getId(),
                e.getProvider().getSlug(),
                e.getProvider().getDisplayName(),
                e.getService().getId(),
                e.getService().getName(),
                e.getWantedDate());
    }
}
