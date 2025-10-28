import './ErrorInfo.css';

const ErrorInfo = ({message}) => {
    return (
        <p className="error-info">{message}</p>
    )
};

export default ErrorInfo;