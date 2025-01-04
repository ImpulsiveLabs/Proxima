import { AccessOptions } from "basic-ftp";

type FTPClientConfig = {
    timeout?: number,
    verbose?: boolean,
    reconnectInterval?: number
} & AccessOptions

export { FTPClientConfig };