import { UpdateResult } from 'typeorm';

export type FinishTaskResponseType = UpdateResult & {
    isSubjectFinish: boolean;
};
