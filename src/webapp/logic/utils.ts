import { D2Api } from "@eyeseetea/d2-api/2.33";
import { User } from "../../domain/entities/User";

interface D2ObjectWithAttributes {
    attributeValues?: Array<{ value?: string; attribute?: { code?: string } }>;
}

export function getObjectVersion(object: D2ObjectWithAttributes): string | null {
    const attributeValues = object.attributeValues || [];
    const versionAttributeValue = attributeValues.find(
        attributeValue => attributeValue.attribute && attributeValue.attribute.code === "VERSION"
    );
    return versionAttributeValue && versionAttributeValue.value ? versionAttributeValue.value.trim() : null;
}

export async function getCurrentUser(api: D2Api) {
    const authorities = await api.get<string[]>("/me/authorization").getData();

    const d2CurrentUser = await api.currentUser
        .get({
            fields: {
                id: true,
                name: true,
                userCredentials: { username: true },
                userGroups: { id: true },
            },
        })
        .getData();

    const currentUser: User = {
        id: d2CurrentUser.id,
        name: d2CurrentUser.name,
        username: d2CurrentUser.userCredentials.username,
        authorities: new Set(authorities),
        userGroups: d2CurrentUser.userGroups,
    };

    return currentUser;
}
