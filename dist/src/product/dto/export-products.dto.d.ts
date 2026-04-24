export declare class ExportProductsDto {
    q?: string;
    stock?: 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';
    active?: 'ALL' | 'YES' | 'NO';
    unit?: string;
    productGroupId?: string;
    forecastMode?: 'ALL' | 'CUSTOM';
    forecastLevel?: 'LOW' | 'OUT';
    createdFrom?: string;
    createdTo?: string;
    ids?: string;
}
