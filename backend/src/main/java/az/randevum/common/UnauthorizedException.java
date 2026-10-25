package az.randevum.common;

/** Bad credentials or refresh token; mapped to 401 by {@link ApiExceptionHandler}. */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
