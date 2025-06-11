import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateNewUserDto } from './createNewUser.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateNewUserDto, ['password', 'status', 'role'] as const)) {}
