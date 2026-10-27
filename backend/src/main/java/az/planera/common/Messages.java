package az.planera.common;

import java.util.List;
import java.util.Locale;
import org.springframework.context.support.ResourceBundleMessageSource;

/**
 * API texts in the interface languages (#94): {@code messages.properties}
 * (Azerbaijani, the default), {@code messages_en} and {@code messages_ru}.
 * Exceptions carry a {@link MessageKey}; the handler renders it in the
 * language of the {@code Accept-Language} header, tests and logs see the
 * Azerbaijani text through {@link Throwable#getMessage()}.
 */
public final class Messages {

    public static final Locale DEFAULT = Locale.forLanguageTag("az");
    public static final List<Locale> SUPPORTED = List.of(DEFAULT, Locale.ENGLISH, Locale.forLanguageTag("ru"));

    private static final ResourceBundleMessageSource SOURCE = new ResourceBundleMessageSource();

    static {
        SOURCE.setBasename("messages");
        SOURCE.setDefaultEncoding("UTF-8");
        // Without a bundle for the requested language the base (Azerbaijani) file answers, never the server's locale.
        SOURCE.setFallbackToSystemLocale(false);
    }

    private Messages() {}

    /** A message key with its arguments; numbers become plain strings so ids never get digit grouping. */
    public static MessageKey key(String code, Object... args) {
        Object[] plain = new Object[args.length];
        for (int i = 0; i < args.length; i++) {
            plain[i] = args[i] instanceof Number ? String.valueOf(args[i]) : args[i];
        }
        return new MessageKey(code, plain);
    }

    public static String get(String code, Locale locale) {
        return SOURCE.getMessage(code, null, locale);
    }

    public static String get(MessageKey key, Locale locale) {
        return SOURCE.getMessage(key.code(), key.args(), locale);
    }

    /** The best supported language for an {@code Accept-Language} header; Azerbaijani when none matches. */
    public static Locale locale(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isBlank()) {
            return DEFAULT;
        }
        try {
            Locale match = Locale.lookup(Locale.LanguageRange.parse(acceptLanguage), SUPPORTED);
            return match != null ? match : DEFAULT;
        } catch (IllegalArgumentException e) {
            return DEFAULT;
        }
    }
}
