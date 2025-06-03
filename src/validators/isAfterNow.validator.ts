import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { parseDateString } from 'src/helper/date.helper';

export function IsAfterNow(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isAfterNow',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any): boolean {
                    if (typeof value !== 'string') return false;

                    const date = parseDateString(value);
                    if (isNaN(date.getTime())) return false;

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    return date.getTime() > today.getTime();
                },
                defaultMessage(args: ValidationArguments) {
                    return `courses.${args.property} must be a valid date in the future (after today)`;
                },
            },
        });
    };
}
