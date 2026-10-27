package az.planera.common;

import java.time.Duration;

/** Mapped to 429 with a {@code Retry-After} header by {@link ApiExceptionHandler}. */
public class TooManyRequestsException extends ApiException {

    private final Duration retryAfter;

    public TooManyRequestsException(String message, Duration retryAfter) {
        super(message);
        this.retryAfter = retryAfter;
    }

    public TooManyRequestsException(MessageKey key, Duration retryAfter) {
        super(key);
        this.retryAfter = retryAfter;
    }

    public Duration getRetryAfter() {
        return retryAfter;
    }
}
