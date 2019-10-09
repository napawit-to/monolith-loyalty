export interface Catalogues {
    CategoryId: number;
    RewardId:number;
    RewardRef: string;
    Image: object;
    Type: number;
    TypeDesc: string;
    RewardTh: string;
    RewardEn: string;
    Point: string;
    PointLabel: string;
    ValidFrom: string;
    ValidThrough:string;
    items:number;
}

export default Catalogues;
