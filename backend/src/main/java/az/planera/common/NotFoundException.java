package az.planera.common;

/** Mapped to 404 by {@link ApiExceptionHandler}. */
public class NotFoundException extends ApiException {

    public NotFoundException(String message) {
        super(message);
    }

    public NotFoundException(MessageKey key) {
        super(key);
    }
}
