package az.planera.common;

/** Mapped to 409 by {@link ApiExceptionHandler}. */
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(message);
    }

    public ConflictException(MessageKey key) {
        super(key);
    }
}
