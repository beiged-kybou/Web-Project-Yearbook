import { cn } from "../../utils/cn";
import styles from "./Button.module.css";

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    isLoading,
    disabled,
    type = 'button',
    ...props
}) => {
    return (
        <button
            type={type}
            className={cn(
                styles.button,
                styles[variant],
                styles[size],
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className={styles.spinner}></span>
            ) : null}
            {children}
        </button>
    );
};

export default Button;
