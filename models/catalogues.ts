export interface User {
    first_name: string;
    last_name: string;
    email: string;
    age: number;
    birthdate?: Date;
    create_timestamp?: Date;
    update_timestamp?: Date;
}

export default User;
