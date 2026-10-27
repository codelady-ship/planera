package az.planera.common;

/** Bad credentials or refresh token; mapped to 401 by {@link ApiExceptionHandler}. */
public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException(MessageKey key) {
        super(key);
    }
}
