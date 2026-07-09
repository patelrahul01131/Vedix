export interface ToolSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
}

export abstract class Tool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly schema: ToolSchema;
  abstract readonly requiresApproval: boolean;

  /**
   * Executes the tool with the provided arguments.
   * If the tool requires approval, the Planner must pause execution
   * and request permission via the EventBus before calling this method.
   */
  abstract execute(args: any): Promise<any>;
}
