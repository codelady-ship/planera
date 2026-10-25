package az.randevum.common;

/** Mapped to 409 by {@link ApiExceptionHandler}. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
