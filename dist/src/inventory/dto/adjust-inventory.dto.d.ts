export declare class AdjustInventoryDto {
    type: 'RESTOCK' | 'ADJUSTMENT';
    delta: number;
    minStock?: number;
    note?: string;
}
