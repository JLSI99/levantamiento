export interface UserPayload{
    id: string;
    username:string;
    email: string;
    role: string;
    capabilities:string[];
}

export interface TokenResponse{
    access_token:string;
    refresh_token:string;
    token_type:string;
    user:UserPayload;
}