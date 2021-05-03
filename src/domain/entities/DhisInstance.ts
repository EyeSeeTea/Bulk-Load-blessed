interface LocalInstance {
    type: "local";
    url: string;
}

interface ExternalInstance {
    type: "external";
    url: string;
    username: string;
    password: string;
}

export type DhisInstance = LocalInstance | ExternalInstance;
