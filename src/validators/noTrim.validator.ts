import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function NoTrimWhitespace(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'noTrimWhitespace',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    if (typeof value !== 'string') return false;
                    return value === value.trim();
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must not have leading or trailing whitespace.`;
                },
            },
        });
    };
}
