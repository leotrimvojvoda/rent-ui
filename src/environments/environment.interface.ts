export interface Environment {
    production: boolean;
    apiUrl: string;
    appName: string;
    /**
     * The API sends money as a plain number with no currency in the contract.
     * Assumed EUR until the backend confirms — change it here only.
     */
    currencySymbol: string;
}
