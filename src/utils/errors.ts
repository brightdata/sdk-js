export class BRDError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'BRDError';
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
        };
    }
}

export class ValidationError extends BRDError {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends BRDError {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class ZoneError extends BRDError {
    constructor(message: string) {
        super(message);
        this.name = 'ZoneError';
    }
}

export class NetworkError extends BRDError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'NetworkError';
    }
}

export class NetworkTimeoutError extends NetworkError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'NetworkTimeoutError';
    }
}

export class TimeoutError extends BRDError {
    constructor(message = 'Operation timed out') {
        super(message);
        this.name = 'TimeoutError';
    }
}

export class FSError extends BRDError {
    constructor(message: string) {
        super(message);
        this.name = 'FSError';
    }
}

export class APIError extends BRDError {
    statusCode: number | null;
    responseText: string | null;

    constructor(
        message: string,
        statusCode: number | null = null,
        responseText: string | null = null,
    ) {
        let msg = message;
        if (statusCode) msg += ` [HTTP${statusCode}]`;
        if (responseText) msg += ` ${responseText}`;
        super(msg);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.responseText = responseText;
    }

    override toJSON() {
        return {
            ...super.toJSON(),
            statusCode: this.statusCode,
            responseText: this.responseText,
        };
    }
}

export class DataNotReadyError extends BRDError {
    constructor(message = 'Data is not ready yet') {
        super(message);
        this.name = 'DataNotReadyError';
    }
}
