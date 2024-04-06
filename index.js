/// <reference types="../CTAutocomplete" />
import { loadAction } from "./importer/loadAction.js";

register("command", () => {
    loadAction([
        {
          "context": "FUNCTION",
          "contextTarget": { "name": "example" },
          "start": [
            
          ],
          "target": [

          ]
        }
      ], {
        timeout: 1000,
        useSafeMode: false,
      },
      (value) => {
        console.log(value);
      })
}).setName("himport");