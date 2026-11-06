import "@dotenvx/dotenvx/config";
import { APIServer } from "#soundy/api";
import Soundy from "#soundy/client";
import { validateConfig, validateEnv } from "#soundy/utils";

validateEnv();
validateConfig();

const client = new Soundy();
APIServer(client);

export default client;
