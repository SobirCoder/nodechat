import { Pool, Client, PoolConfig, PoolClient, QueryResult, QueryResultRow } from 'pg';
import _ from 'underscore';
import dotenv from 'dotenv';
dotenv.config();

export class DB {
  private static instance: Pool;
  
  private static config : PoolConfig = { user: process.env.DB_USER,
                                     password: process.env.DB_PASSWORD,
                                     database: process.env.DB_DATABASE,
                                     host: process.env.DB_HOST,
                                     port: Number(process.env.DB_PORT) };

  static getUserPool() : Pool {
    if (!DB.instance) {
        DB.instance = new Pool(DB.config);
      }
      return DB.instance;
  }

  private static async getClient() {
    const client = await DB.getUserPool().connect();
    return client;
  }

  static async clientQuery(client :PoolClient, queryText: string) {
    let res :QueryResult[] = [];
    const query = { text: queryText, rowMode: 'object' };
    await client.query(query)
                .then((result) => {
                  if (result) res = result.rows;
                }).catch((err) => {
                  //TODO   logging goes here
                  client.release(true);
                  throw(err);
                });

    return res;
  }

  static makeMethodStatement(methodName :string, param :object) {
    let method = `${methodName}`;
    if (!_.isUndefined(param) && !_.isEmpty(param))
      method += `('${JSON.stringify(param)}'::jsonb);`;
    else
      method += '();';

    return method;
  }

  static async callFunction(functionName: string, param: object) {
    let client = await DB.getClient(),
        query = `select ${this.makeMethodStatement(functionName, param)}`;

    let result :QueryResult<object>[] = await this.clientQuery(client, query);
    client.release(true);

    return result[0][functionName.toLowerCase()];
  }

  static async callProcedure(procedureName: string, param: object) {
    let client = await DB.getClient(),
        query = `call ${DB.makeMethodStatement(procedureName, param)}`;
    await DB.clientQuery(client, query);
    client.release(true);
  }
}
