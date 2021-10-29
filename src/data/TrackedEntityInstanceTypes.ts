import { Id } from "../types/d2-api";

export interface DataValueApi {
    dataElement: Id;
    value: string | number | boolean;
}
