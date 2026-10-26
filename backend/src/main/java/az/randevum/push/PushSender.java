package az.randevum.push;

import az.randevum.domain.PushSubscription;

/** Delivers one message to one subscription through its push service. */
public interface PushSender {

    /**
     * @return the push service's HTTP status (201 accepted, 404/410 the
     *     subscription is gone), or 0 when the service could not be reached
     */
    int send(PushSubscription subscription, PushMessage message);
}
