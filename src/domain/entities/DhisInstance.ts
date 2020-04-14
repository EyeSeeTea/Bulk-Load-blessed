interface BaseInstance {
    url: string;
}

interface LocalInstance extends BaseInstance {
    url: string;
}

interface ExternalInstance extends BaseInstance {
    url: string;
    username: string;
    password: string;
}

export type DhisInstance = LocalInstance | ExternalInstance;
