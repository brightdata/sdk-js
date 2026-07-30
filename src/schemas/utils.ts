import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function assertSchema<K>(
    schema: z.ZodType<K>,
    input: unknown,
    label: string = '',
): z.infer<typeof schema> {
    const inputParsed = schema.safeParse(input);

    if (!inputParsed.success) {
        const prefix = label ? `${label}: \n` : '';
        throw new ValidationError(prefix + z.prettifyError(inputParsed.error));
    }

    return inputParsed.data;
}
