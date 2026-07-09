import { Tool, ToolSchema } from '../Tool';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SyntaxCheckerTool } from './SyntaxCheckerTool';

export class UpdateFileTool extends Tool {
  readonly name = 'edit_file';
  readonly description = 'Replaces one or more specific ranges of lines in an existing file. Use this for all edits to existing files. You MUST provide the replacements array containing startLine, endLine, expectedContent, and replacementContent for each edit.';
  readonly requiresApproval = true;

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file.' },
      replacements: {
        type: 'array',
        description: 'A list of chunks to replace. Provide multiple chunks for non-contiguous edits in the same file to save time.',
        items: {
          type: 'object',
          properties: {
            startLine: { type: 'number', description: 'The starting line number (1-indexed) of the block to replace.' },
            endLine: { type: 'number', description: 'The ending line number (1-indexed) of the block to replace.' },
            expectedContent: { type: 'string', description: 'The exact code that you expect to currently exist between startLine and endLine. This is a safeguard against blind overwriting.' },
            replacementContent: { type: 'string', description: 'The new text to insert in place of the specified lines.' }
          },
          required: ['startLine', 'endLine', 'expectedContent', 'replacementContent']
        }
      }
    },
    required: ['path', 'replacements']
  };

  async execute(args: { path?: string, filePath?: string, file_path?: string, filename?: string, replacements?: any[] }): Promise<any> {
    const p = args.path || args.filePath || args.file_path || args.filename;
    if (!p || typeof p !== 'string' || p.trim() === '') {
      return { success: false, error: 'You must provide a valid "path" argument.' };
    }

    try {
      const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), '../../');
      const resolvedPath = path.resolve(workspaceRoot, p);
      
      if (args.replacements && Array.isArray(args.replacements) && args.replacements.length > 0) {
         let current = await fs.readFile(resolvedPath, 'utf8');
         let lines = current.split(/\r?\n/);
         const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();

         // Pre-flight check and auto-correct line numbers (Fuzzy Snapping)
         for (const rep of args.replacements) {
             const expectedNormalized = normalize(rep.expectedContent);
             const targetBlock = lines.slice(Math.max(0, rep.startLine - 1), rep.endLine).join('\n');
             
             // If it doesn't match perfectly, attempt fuzzy search
             if (normalize(targetBlock) !== expectedNormalized) {
                 const expectedLinesCount = rep.expectedContent.split(/\r?\n/).length;
                 let bestMatch = null;
                 let minDistance = Infinity;
                 
                 for (let i = 0; i < lines.length - expectedLinesCount + 1; i++) {
                     const block = lines.slice(i, i + expectedLinesCount).join('\n');
                     if (normalize(block) === expectedNormalized) {
                         const distance = Math.abs((i + 1) - rep.startLine);
                         if (distance < minDistance) {
                             minDistance = distance;
                             bestMatch = { startLine: i + 1, endLine: i + expectedLinesCount };
                         }
                     }
                 }
                 
                 if (bestMatch) {
                     rep.startLine = bestMatch.startLine;
                     rep.endLine = bestMatch.endLine;
                 } else {
                     return { 
                       success: false, 
                       error: `Safeguard Failed! The lines you tried to edit do not match your expectedContent, and auto-snapping could not find a match. The file has changed since you last saw it.\n\nYour expectedContent:\n${rep.expectedContent}\n\nActual content on lines ${rep.startLine}-${rep.endLine}:\n${targetBlock}\n\nYou MUST use read_file to get the latest file content and exact line numbers before trying to edit this file again.` 
                     };
                 }
             }

             if (rep.startLine > rep.endLine) {
                 return { success: false, error: `startLine (${rep.startLine}) cannot be greater than endLine (${rep.endLine}).` };
             }
             if (rep.startLine < 1 || rep.endLine > lines.length) {
                 return { success: false, error: `Invalid line range ${rep.startLine}-${rep.endLine}. File has ${lines.length} lines.` };
             }
         }

         // Sort replacements descending by startLine to avoid shifting line numbers as we edit
         const sortedReplacements = [...args.replacements].sort((a, b) => b.startLine - a.startLine);

         // All safeguards passed! Apply edits from bottom to top
         for (const rep of sortedReplacements) {
             const beforeLines = lines.slice(0, rep.startLine - 1);
             const afterLines = lines.slice(rep.endLine);
             
             // Create the updated string for this block, then split it back into lines to insert
             const replacementLines = rep.replacementContent.split(/\r?\n/);
             lines = [...beforeLines, ...replacementLines, ...afterLines];
         }
         
         const updated = lines.join('\n');
         await fs.writeFile(resolvedPath, updated, 'utf8');

         // Automatically check syntax
         const syntaxTool = new SyntaxCheckerTool();
         const syntaxResult = await syntaxTool.execute({ path: resolvedPath });
         if (!syntaxResult.success) {
           return { success: true, message: `Successfully applied ${args.replacements.length} replacements in ${resolvedPath}, BUT SYNTAX ERROR FOUND:\n${syntaxResult.error}\n\nYou must fix this syntax error immediately!` };
         }

         return { success: true, message: `Successfully applied ${args.replacements.length} replacements in ${resolvedPath}. Syntax check passed.` };
      } else {
         return { success: false, error: 'Must provide a valid replacements array.' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
