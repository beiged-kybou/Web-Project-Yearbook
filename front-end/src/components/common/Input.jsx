import { forwardRef } from 'react';
import { cn } from "../../utils/cn";
import styles from "./Input.module.css";

const Input = forwardRef(({
    label,
    error,
    className,
    id,
    type = "text",
    ...props
}, ref) => {
    const inputId = id || props.name;

    return (
        <div className={cn(styles.container, className)}>
            {label && (
                <label htmlFor={inputId} className={styles.label}>
                    {label}
                </label>
            )}
            <input
                ref={ref}
                id={inputId}
                type={type}
                className={cn(
                    styles.input,
                    error && styles.hasError
                )}
                {...props}
            />
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    );
});

Input.displayName = "Input";

export default Input;
