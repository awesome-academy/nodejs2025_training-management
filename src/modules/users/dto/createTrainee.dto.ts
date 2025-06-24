import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateNewUserDto } from './createNewUser.dto';

export class CreateTraineeDto extends PartialType(OmitType(CreateNewUserDto, ['password', 'role'] as const)) {}
