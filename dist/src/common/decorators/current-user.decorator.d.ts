export type AuthenticatedUser = {
    sub: string;
    email: string;
    role: string;
    fullName: string;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
