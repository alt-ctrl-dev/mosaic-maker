export type SandboxEnv = {
    OPENROUTER_API_KEY: string;
}

export type Issue = {
 id: string;
 title: string;
 branch: string;
}

export type Agent<T> = {
    run: ()=>Promise<T>
}