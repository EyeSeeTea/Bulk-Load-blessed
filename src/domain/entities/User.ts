import _ from "lodash";
import { getCurrentTimestamp } from "../../utils/time";
import { Ref } from "./ReferenceObject";

export interface User {
    id: string;
    username: string;
    name: string;
    authorities: Set<string>;
    userGroups: Ref[];
}

export interface UserTimestamp {
    user: Pick<User, "id" | "username" | "name">;
    timestamp: string;
}

export function getUserTimestamp(currentUser: User): UserTimestamp {
    const timestamp = getCurrentTimestamp();
    const user = _.pick(currentUser, ["id", "username", "name"]);
    return { user, timestamp };
}
