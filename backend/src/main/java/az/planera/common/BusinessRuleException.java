package az.planera.common;

/** A well-formed request that breaks a business rule; mapped to 422 by {@link ApiExceptionHandler}. */
public class BusinessRuleException extends ApiException {

    public BusinessRuleException(String message) {
        super(message);
    }

    public BusinessRuleException(MessageKey key) {
        super(key);
    }
}
