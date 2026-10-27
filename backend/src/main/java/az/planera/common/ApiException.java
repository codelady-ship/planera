package az.planera.common;

import java.util.Locale;

/**
 * Base of the API's own exceptions. One is built either from a plain text
 * (used as is) or from a {@link MessageKey}, which {@link ApiExceptionHandler}
 * renders in the caller's language; {@link #getMessage()} gives the
 * Azerbaijani default.
 */
public abstract class ApiException extends RuntimeException {

    private final MessageKey key;

    protected ApiException(String message) {
        super(message);
        this.key = null;
    }

    protected ApiException(MessageKey key) {
        super(Messages.get(key, Messages.DEFAULT));
        this.key = key;
    }

    /** The message for the client in {@code locale}; a plain-text exception has only one wording. */
    public String localizedMessage(Locale locale) {
        return key == null ? getMessage() : Messages.get(key, locale);
    }
}
