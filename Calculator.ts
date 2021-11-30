

type oplist = Array<string> | string[];

interface lex_result {
    numbers: oplist,
    operators: oplist
}

interface matches {
    left_position: number,
    right_position: number
}


class Calculator {
  



  private debug_on:boolean = false;
  declare private allow_exit:boolean;

  /**
   * Check if string is valid operator.
   * = checks equality and , is used in function calls.
   * @param op Query string.
   * @returns T/F
   */
  private isoperator(op:string): boolean {
    if (op === "+" || op === "-" || op === "*" ||
        op === "/" || op === "^" || op === "=" || op === ",") {
          return true;
        } else return false;
  }

  /**
   * Pairs parenthesis tokens.
   * @param input Raw expression.
   * @returns Array of matches.
   */
  private lex_parenthesis(input:string): Array<matches> {
    //Set of individual tokens.
    let stack = [];

    let stack_length = 0;
    let lcount = 0;
    let rcount = 0;

    for (let i = 0; i < input.length; i++) {

      //Push individual tokens and their positions.

      if (input[i] === "(") {
        stack.push({
          position: i,
          type: "left"
        });
        stack_length++;
        lcount++;
      } else if (input[i] === ")") {
        stack.push({
          position: i,
          type: "right"
        });
        stack_length++;
        rcount++;
      }
    } this.D(`LexicalAnalyzer: Appended ${lcount+rcount} items in lexical analysis.`);

    //If this is true, the user has entered a token which does not have a pair.
    if (lcount !== rcount) {
      if (lcount < rcount) {
        throw new Error(`Syntax, ')' instances expect '('.`);
      } else {
        throw new Error(`Syntax, '(' instances expect ')'.`);
      }
    }


    let iterator = 0;
    let matches_p:Array<matches> = [];  //match array.

    stack_length = stack.length;

    //The logic of this portion is as follows.
    //The lexer will look for pairs of tokens which are side by side (ie '()'). When these are found
    //they will be removed from the array of tokens and pushed to the matches array. Eventually the 
    //original array will be empty because all tokens are paired.

    while (stack_length > 0) {

      //Return to start of string.
      if (iterator >= stack.length) {
        iterator = 0;
        continue;
      }

      //Event of 2 pairable tokens being indexed.
      if (stack[iterator].type === "left" && stack[iterator+1].type === "right") {
        matches_p.push({
          left_position: stack[iterator].position,
          right_position: stack[iterator+1].position
        });

        //Remove 2 tokens from original data set.
        let copy = [];
        for (let i = 0; i < stack.length; i++) {
          if (i !== iterator && i !== iterator+1) {
            copy.push(stack[i]);
          }
        } stack = copy;


        stack_length = copy.length;
      }

      iterator++;
    }

    this.D(`LexicalAnalyzer: Created ${matches_p.length} nodes.`);

    return matches_p;
  }

  /**
   * Simply matches '(' token with it's pair.
   * @param index Index in raw expression.
   * @param matches_p Match array of parenthesis.
   * @returns Indexed pair (-1) on failure although that should never happen.
   */
  private find_pair(index:number, matches_p:Array<matches>):number {
    for (let i = 0; i < matches_p.length; i++) {
      if (matches_p[i].left_position === index) {
          return matches_p[i].right_position;
      }
    } throw new Error("Garbage values."); //This should absolutely NEVER happen.
  }

  private nest_calls_prec:number = 0;     //Count of recursive expression parsing calls.
  private casted:number = 0;              //Count of casted nodes.
  private ops:number = 0;                 //Count of operators.
  private vars:number = 0;                //Count of evaluated variables.
  private calculations:number = 0;        //Count of calculations (evaluated expressions).

  /**
   * Constructs parsed expressions in tree. Looks for parenthesized expressions and nests them as arrays.
   * @param input Raw input.
   * @param matches_p Matched parenthesis tokens.
   * @param offset Offset from current index, needed in recursion.
   * @returns 
   */
  private form_precedence(input:string, matches_p:Array<matches>, offset:number): any {
    this.nest_calls_prec++;
    let op = [];
    let op_cur = 0;

    for (let i = 0; i < input.length; i++) {
      if (input[i] === "(") {

        //From opening token to closing token.
        let fpair = this.find_pair(i+offset, matches_p);
        let prec = input.substring(i+1, fpair-offset);

        //Recursion for possible nested expressions.
        op.push( this.form_precedence(prec, matches_p, offset+i+1) );
        i += (prec.length+1);

      //This conditional kills 2 birds with one stone, we don't care about the closing parenthesis because we already
      //were able to tell where is was from it's pair. We also don't want whitespace.
      } else if (input[i] !== ")" && input[i] !== " ") op.push(input[i]);
    }

    return op;
  }




  /**
   * Converts the tree to number types and does other extra tree parsing.
   * @param input The tree.
   * @returns Parsed tree with number typed integers.
   */
  private conv_int(input:any): any {

    let casted = 0;
    let ops = 0;

    //Copied tree.
    let int_a = [];

    for (let i = 0; i < input.length; i++) {
      
      if (typeof (input[i]) === "object") {
        int_a.push( this.conv_int(input[i]) );  //Recursion for nested expressions.
      } else {

        let conv:number = parseFloat(input[i]); //Test conversion.
        let convstr:string = "";                //Main buffer for later conversion.

        let exemption = false;

        if (!isNaN(parseFloat(input[i-1])) && (input[i] === "e")) {
          exemption = true;
        }

        if (!isNaN(conv) || exemption) { //Is node a number?
          let j:number;
          let isop = false; //Is operator.
          for (j = i; j < input.length; j++) {
            if ((!isNaN(parseFloat(input[j])) || input[j] === "."  || input[j] === "e") && !this.isoperator(input[j]) && typeof(input[j]) !== "object") {
              //Append 'stringified' integer, at this point we don't want mathematical operations, just string concatenation.
              

              if (input[j] === "e" && input[j+1] === "+") {
                convstr += "e+";
                j++;
              } else {
                convstr += input[j];
              }
              
              
              if (exemption) {
                exemption = false;
              }
            } else if (this.isoperator(input[j])) {
              isop = true;
              break;
            } else {
              j--;
              break;
            }
          } 
          i = j;  //Jump iterator.
          this.casted++;

          //Push converted number and optionally, the following operator if applicable.
          int_a.push(parseFloat(convstr)); 
          if (isop) {
            int_a.push(input[j]);
          }

          continue;
        } else {
          let nstr = "";

          let j:number;
          let isop = false;
          for (j = i; j < input.length; j++) {

            //This mess determines if the node is an intentional string.
            if ((isNaN(parseFloat(input[j]))) && typeof(input[j]) !== "object" && !this.isoperator(input[j])) {
              nstr += input[j];
            } else if (this.isoperator(input[j])) {
              isop = true;
              break;
            } else break;
          }
          i = j;  //Jump iterator.
          this.ops++;
          if (nstr.length > 0) int_a.push(nstr);
          if (isop) int_a.push(input[j]);
          if (!isNaN(parseFloat(input[j]))) i--;  //Integers get incremented too much.
          if (typeof(input[j]) === "object") {
            //Recursively handle objects again for some reason.
            int_a.push(this.conv_int(input[j]));
            i++;
          }
          continue;
        }
      }
    }
    
    return int_a;
  }





  /**
   * Evaluates variables and functions, this technically has priority over ever expression in the order of operations.
   * @param input Parsed tree.
   * @returns Tree with evaluated variables.
   */
  private eval_vars(input:any): any {
    

    /**
     * Assert certain parameters for functions and call them recursively.
     * @param fn Function name.
     * @param i Position in tree.
     * @param args Function required arguments.
     * @returns Nothing.
     */
    const qasserts = (fn:string, i:number, args:string[], optional:boolean=false) => {

      //Only really handles the exit function and the rand function, the only 2 functions that currently have zero arguments.
      if (args.length === 0) {
        return [];
      }

      //In the event of a function being called at the end of an expression with no
      //arguments, even when arguments are expected.
      if (input[i+(args.length-1)] === undefined && !optional) {
        throw new Error(`Syntax, '${fn}' requires '${args.join(",")}'. Expression ends before expected values.`);
      } 

      //Maybe remove.
      //if (typeof (input[i+1]) !== "object" && args.length > 1) {
        //throw new Error(`Syntax, '${fn}' requires '${args.join(",")}'`);
      //}

      //Set of arguments to parameters, these will be evaluated and passed back to the calling function.
      let eval_args:any[] = [];

      //Current argument in set.
      let c_eval:any[] = [];
      let intent:string;

      let iter:any;
      if (typeof (input[i+1]) === "object") {
        iter = input[i+1];
        intent = "nested"; 
      } else { 
        iter = input.slice(i+1, input.length);
        intent = "inferred";
      } 

      //Construct main set.
      for (let j = /*intent === "inferred" ? i+1: */0; j < iter.length; j++) {
        if (iter[j] === ",") { //handle special ',' operator.
          eval_args.push(c_eval);
          c_eval = [];
        } else c_eval.push(iter[j]); 
      } eval_args.push(c_eval);
    
      if (eval_args.length !== args.length) {
        throw new Error(`Syntax, '${fn}' requires '${args.join(", ")}'. Got ${eval_args.length} arguments.`);
      }

      //The set to be evaluated recursively.
      let expr_args = [];

      for (let j = 0; j < eval_args.length && j < args.length; j++) {
        //This is the command that is to be sent to the calculate() method.
        let eval_string:string = "";

        //Concatenates arrays members, is anonymous to control program flow.
        const eval_anon = (arr:any[]) => {
          for (let n = 0; n < arr.length; n++) {
            
            if (typeof(arr[n]) === "object") {
              eval_string += "(";
              eval_anon(arr[n]);  //recursive call to implement nested expressions.
              eval_string += ")";
            } else if (typeof (arr[n]) !== "undefined") {
              eval_string += arr[n].toString(); //should be regular values aka operators or numbers.
            }
          }
        }

        //This distinction fixes a really weird nesting issue that prevents calls to functions with no parenthesis.
        //if (intent === "inferred") {
          //if (typeof (input[i+1]) === "object") eval_anon(eval_args[j][0]);
          /*else*/ eval_anon(eval_args[j]);
        //}

        //This prevents void arguments from being evaluated when they expect more arguments.
        //Ex: sqrt() would be caught here.
        if (eval_string.trim() === "" && !optional) {
          throw new Error(`Syntax, '${fn}' requires '${args.join(",")}'. Found less than ${args.length} values.`);
        } else if (optional && eval_string.trim() === "") {
          return [null, intent === "inferred" ? args.length + (args.length - 1): 1];
        }

        //Recursive call.
        expr_args.push( this.calculate(eval_string) );
      }


      return [
        [expr_args],  //Evaluated arguments.
        intent === "inferred" ? args.length + (args.length - 1): 1 //Offset to increment iterator by.
      ]
    }

    //Tree with evaluated variables.
    let vars = [];
    
    for (let i = 0; i < input.length; i++) {
      if (typeof input[i] === "object") {
        vars.push(this.eval_vars(input[i]));  //Recursion to evaluate nested expressions.
      } else if (!this.isoperator(input[i]) && typeof input[i] !== "number") {  //This will only be a variable or function call.
        
        switch(input[i].toLowerCase()) {
          case "pi":
            vars.push(Math.PI);
            break
          case "e":
            vars.push(Math.E);
            break;

          case "sqrt": {
            let inv:any[] = qasserts("sqrt", i, ["number"]);
            let arg = <number> inv[0][0];
            if (arg < 0) {
              throw new Error("Error, Imaginary number solution (nonreal solution).");
            }
            vars.push(Math.sqrt(arg));
            i += <number> inv[1];
          } break;

          case "log": {
            let inv:any[] = qasserts("log", i, ["number"]);
            let arg = <number> inv[0][0];
            vars.push(Math.log10(arg));
            
            i += <number> inv[1];
          } break;

          case "logbase": {
            let inv:any[] = qasserts("logBASE", i, ["base", "number"]);
            let base = <number> inv[0][0][0];
            let num = <number> inv[0][0][1];

            if (isNaN(num)) {
              throw new Error(`Syntax, 'logBASE' requires 'base,number', found only 'base'.`);
            }

            if (base === 1) {
              throw new Error("Error, Log base 1.");
            } else if (base < 0) {
              throw new Error("Error, Signed log base.");
            }


            let calc = Math.log(num) / Math.log(base);
            vars.push(calc);
            i += <number> inv[1];
          } break; 

          case "sin": {
            let inv:any[] = qasserts("sin", i, ["number"]);
            let num = <number> inv[0][0];
            vars.push(Math.sin(num));
            i += <number> inv[1];
          } break;

          case "cos": {
            let inv:any[] = qasserts("cos", i, ["number"]);
            let num = <number> inv[0][0];
            vars.push(Math.cos(num));
            i += <number> inv[1];
          } break;

          case "tan": {
            let inv:any[] = qasserts("tan", i, ["number"]);
            let num = <number> inv[0][0];
            vars.push(Math.tan(num));
            i += <number> inv[1];
          } break;

          case "asin": {
            let inv:any[] = qasserts("asin", i, ["number"]);
            let num = <number> inv[0][0];
            vars.push(Math.asin(num));
            i += <number> inv[1];
          } break;

          case "acos": {
            let inv:any[] = qasserts("acos", i, ["number"]);
            let num = <number> inv[0][0];
            vars.push(Math.acos(num));
            i += <number> inv[1];
          } break;

          case "atan": {
            let inv:any[] = qasserts("atan", i, ["number"]);
            let num = <number> inv[0][0];
            vars.push(Math.atan(num));
            i += <number> inv[1];
          } break;

          case "abs": {
            let inv:any[] = qasserts("abs", i, ["expression"]);
            let num = <number> inv[0][0];
            vars.push(Math.abs(num));
            i += <number> inv[1];
          } break;

          case "exit": {

            if (!this.allow_exit) {
              throw new Error("Exit is not permitted in this context.");
            }

            qasserts("exit", i, []);
            console.log("Terminating calculator.");
            Deno.exit(0);
          } break;

          case "random": {
            let inv:any[] = qasserts("random", i, ["minimum", "maxmimum"]);

            let max = <number> inv[0][0][1];
            let min = <number> inv[0][0][0];
  
            
            let rand = Math.floor((Math.random() * max) + min);
            vars.push(rand);
            i += <number> inv[1];
          } break;

          case "rand": {
            qasserts("rand", i, []);
            vars.push(Math.random());
          } break;

          case "mod": {
            let inv:any[] = qasserts("mod", i, ["num1", "num2"]);

            let num1 = <number> inv[0][0][0];
            let num2 = <number> inv[0][0][1];

            vars.push(num1 % num2);
            i += <number> inv[1];
          } break;

          case "and": {
            let inv:any[] = qasserts("and", i, ["num1", "num2"]);
            let num1 = <number> inv[0][0][0];
            let num2 = <number> inv[0][0][1];
            vars.push(num1 & num2);
            i += <number> inv[1];
          } break;

          case "or": {
            let inv:any[] = qasserts("or", i, ["num1", "num2"]);
            let num1 = <number> inv[0][0][0];
            let num2 = <number> inv[0][0][1];
            vars.push(num1 | num2);
            i += <number> inv[1];
          } break;

          case "xor": {
            let inv:any[] = qasserts("xor", i, ["num1", "num2"]);
            let num1 = <number> inv[0][0][0];
            let num2 = <number> inv[0][0][1];
            vars.push(num1 ^ num2);
            i += <number> inv[1];
          } break;

          case "compl": {
            let inv:any[] = qasserts("compl", i, ["number"]);
            let num = <number> inv[0][0];
            vars.push(~num);
            i += <number> inv[1];
          } break;

          case "rshift": {
            let inv:any[] = qasserts("rshift", i, ["num", "n"]);
            let num1 = <number> inv[0][0][0];
            let num2 = <number> inv[0][0][1];
            vars.push(num1 >> num2);
            i += <number> inv[1];
          } break;

          case "rshiftz": {
            let inv:any[] = qasserts("rshiftz", i, ["num", "n"]);
            let num1 = <number> inv[0][0][0];
            let num2 = <number> inv[0][0][1];
            vars.push(num1 >>> num2);
            i += <number> inv[1];
          } break;

          case "lshift": {
            let inv:any[] = qasserts("lshift", i, ["num", "n"]);
            let num1 = <number> inv[0][0][0];
            let num2 = <number> inv[0][0][1];
            vars.push(num1 << num2);
            i += <number> inv[1];
          } break;




          default:
            throw new Error(`Syntax, unexpected identifier '${input[i]}' around char ${i}.`);
        }

        this.vars++;
      } else vars.push(input[i]); //Regular values.
    }

    return vars;
  }





  /**
   * Main visitor function. This function takes the parsed expression and evaluates it, thereby following the 
   * order of operations.
   * @param input The parsed expression.
   * @returns The result of the expression.
   */
  private evaluate(input:any): any {

    //In the event of '()' being evaluated.
    if (input.length === 0) {
      throw new Error("Syntax, parenthesis contain no values.")
    }

    let expr = input;

    //Asserts that preceding and succeeding nodes exist and are numbers.
    const value_asserts = (i:number, operator:string) => {
      if (expr[i] === undefined) {
        throw new Error(`Syntax, expected operator around char ${i}.`);
      }

      if (expr[i-1] === undefined) {
        throw new Error(`Syntax, expected lvalue for operator '${operator}' around char ${i}.`);
      }
      
      if (expr[i+1] === undefined) {
        throw new Error(`Syntax, expected rvalue for operator '${operator}' around char ${i}.`);
      } 

      //The event of operators being compounded.
      if (this.isoperator(expr[i-1]) || this.isoperator(expr[i+1])) {
        let bad_op = this.isoperator(expr[i-1]) ? expr[i-1] : expr[i+1];
        let bad_pos = this.isoperator(expr[i-1]) ? i-1 : i+1;
        throw new Error(`Syntax, unexpected operator '${bad_op}' at ${bad_pos}.`);
      }
    }

    //The following structure evaluates regions of the expression adhering to the order of operations. Every evaluation 
    //follows a similiar structure albeit with small differences.


    //parenthesis first.
    let paren = [];
    for (let i = 0; i < input.length; i++) {
      if (typeof(input[i]) === "object" && (typeof(input[i-1]) === "object" || typeof(input[i-1]) === "number" || this.isoperator(input[i-1]) || input[i-1] === undefined)) {
        //parenthesized expressions utilize recursion to evaluate.
        paren.push( this.evaluate(input[i])[0] );
      } else paren.push(input[i]);
    } expr = paren;


    //Evaluate variables and functions next. So really it is PVEMDAS (Parenthesis, Variables, Exponents, Multiplication, Division, Addition, Subtraction).
    expr = this.eval_vars(expr);


    //Converts signed numbers to their actual signed form. '["-", 15] -> [-15]'
    if (expr.includes("-")) {
      let neg = [];
      for (let i = 0; i < expr.length; i++) {
        if ((this.isoperator(expr[i-1]) || i-1 < 0) && expr[i] === "-") {
          if (typeof (expr[i+1]) !== "number") { //the event of a minus operator being used before another operator.
            throw new Error("Syntax, cannot sign an operator.");
          }
          if (expr[i+1] === 0) {
            throw new Error("Syntax, cannot sign 0.");
          }
          neg.push(expr[i+1] * (-1)); //sign the number.
          i++;
          this.calculations++;
        } else neg.push(expr[i]);
      } expr = neg;
    }


    //Exponential expressions.
    if (expr.includes("^")) {
      let pow = [];
      for (let i = 0; i < expr.length; i++) {
        if (expr[i+1] === "^") {
          value_asserts(i+1, "^");
          pow.push(Math.pow(expr[i], expr[i+2]));
          this.calculations++;
          i += 2;
        } else pow.push(expr[i]);
      } expr = pow;
    }

    //Unary expressions (multiplication).
    if (expr.includes("*")) {
      let mult = [];
      for (let i = 0; i < expr.length; i++) {
        if (expr[i+1] === "*") {
          value_asserts(i+1, "*");
          mult.push(expr[i] * expr[i+2]);
          i += 2;
          this.calculations++;
        } else mult.push(expr[i]);
      } expr = mult;
    }

    //Division expressions.
    if (expr.includes("/")) {
      let div = [];
      for (let i = 0; i < expr.length; i++) {
        if (expr[i+1] === "/") {
          value_asserts(i+1, "/");
          if (expr[i+2] === 0) { //Handle division by 0.
            throw new Error("Error, Divide by 0.");
          } else div.push(expr[i] / expr[i+2]);
          i += 2;
          this.calculations++;
        } else div.push(expr[i]);
      } expr = div;
    }

    //Additional expressions.
    if (expr.includes("+")) {
      let add = [];
      for (let i = 0; i < expr.length; i++) {
        if (expr[i+1] === "+") {
          value_asserts(i+1, "+");
          add.push(expr[i] + expr[i+2]);
          i += 2;
          this.calculations++;
        } else add.push(expr[i]);
      } expr = add;
    }

    //Minus sign expressions.
    if (expr.includes("-")) {
      let minus = [];
      for (let i = 0; i < expr.length; i++) {
        if (expr[i+1] === "-") {
          value_asserts(i+1, "-");
          minus.push(expr[i] - expr[i+2]);
          i += 2;
          this.calculations++;
        } else minus.push(expr[i]);
      } expr = minus;
    }

    //Equality checking. Evaluates to 1 on an expression being true, the contrary evaluates to 0.
    if (expr.includes("=")) {
      let eq = [];
      for (let i = 0; i < expr.length; i++) {
        if (expr[i+1] === "=") {
          value_asserts(i+1, "=");
          if (expr[i] === expr[i+2]) {
            eq.push(1);
          } else eq.push(0);
          i += 2;
          this.calculations++;
        } else eq.push(expr[i]);
      } expr = eq;
    }
    

    if (expr.length > 1 || this.isoperator(expr[0])) {

      //Some invalid syntax can't detected early on. The visitor knows that something has gone wrong if there
      //are still operators in the expression tree.
      if (expr.length === 1 && this.isoperator(expr[0])) {
        throw new Error(`Syntax, unexpected use of '${expr[0]}' operator.`);
      }

      //In this case, some evaluations still need to be done, this will chain a recursive call until the expression
      //is fully evaluated.
      for (let i = 0; i < expr.length; i++) {
        if (this.isoperator(expr[i])) {
          return this.evaluate(expr);
        }
      }
      
      //Evaluate implicit multiplication. This happens whenever parenthesized expressions meet other expressions
      //or numbers. For example: "(5)(5)" doesn't use the unary operator, but is understood to be multiplication,
      //that is handled here by recursively calling the calculate method on the remaining operands.
      expr = [this.calculate( expr.join("*") )];
    }
    
    return expr;
  }

  /**
   * Sometimes used debug print function.
   * @param debug Message to print.
   */
  private D(debug:string): void {
    if (this.debug_on === true) console.log(debug);
  }



  /**
   * Evaluate expressions. Does not use eval.
   * @param input Expression in string form.
   * @param debug Debug switch enables print debugging.
   * @returns nothing
   */
  public calculate(input:string, debug=false): number {
    if (input.trim() === "") {
      throw new Error("Syntax, no input.");
    }

    this.debug_on = debug;

    const res = this.lex_parenthesis(input);
    const prec = this.form_precedence(input, res, 0);
    this.D(`Parser: Constructed ${this.nest_calls_prec} prioritized nodes.`);
    const conv = this.conv_int(prec);
    this.D(`Parser: Converted ${this.casted} values and copied ${this.ops} operators.`);

    

    //const expr = this.eval_vars(conv); //get this out of the way.
    this.D(`Visitor: Evaluated ${this.vars} static or dynamic symbols.`);


    const ans = this.evaluate(conv)[0];
    this.D(`Visitor: Completed ${this.calculations} calculations.`);

    return ans;
  }



  constructor(useExit:boolean = false) {
    this.allow_exit = useExit;
  }
}


function help_fn(prompt:string): void {
  switch (prompt.toLowerCase().trim()) {
    default:
      console.error(`help: '${prompt.trim()}' is not in the help index.`);
      return;
    
    case "":
      console.log(`Welcome to the calculator. Start calculating by entering expressions.`);
      break;

    case "sqrt":
      console.log(`sqrt(n): Calculate square root of n.`);
      break;

    case "log": 
      console.log("log(n): Calculate logarithm base 10 of n.");
      break;

    case "sin": 
      console.log("sin(n): Calculate the sine of n.");
      break;

    case "asin": 
      console.log("asin(n): Calculate the arc sine of n.");
      break;

    case "cos": 
      console.log("cos(n): Calculate the cosine of n.");
      break;

    case "acos": 
      console.log("sin(n): Calculate the sine of n.");
      break;
    
    case "tan": 
      console.log("tan(n): Calculate the tangent of n.");
      break;
  
    case "atan": 
      console.log("atan(n): Calculate the arc tangent of n.");
      break;

    case "exit": 
      console.log("exit(): Exit the calculator.");
      break;

    case "rand": 
      console.log("rand(): Calculate a random number between 0 and 1.");
      break;

    case "logbase":
      console.log("logBASE(b, n): Calculate logarithm base b of n."); 
      break; 

    case "random":
      console.log("random(a, b): Generate a random number between a and b.");
      break;

    case "mod":
      console.log("mod(a, b): Calculate modulus of a and b (remainder). Akin to 'a % b'.");
      break;

    

    case "and": 
      console.log("and(a, b): Bitwise AND calculation with a and b.");
      break;
    case "or":
      console.log("or(a, b): Bitwise OR calculation with a and b.");
      break;
    case "xor":
      console.log("xor(a, b): Bitwise XOR calculation with a and b.");
      break;
    case "compl":
      console.log("compl(n): Bitwise compliment of n. (flips all bits).");
      break;
    case "rshift":
      console.log("rshift(a, b): Bitwise shift right of a, b times.");
      break;
    case "lshift":
      console.log("lshift(a, b): Bitwise shift left of a, b times.");
      break;
    case "rshiftz":
      console.log("rshiftz(a, b) Bitwise shift right of a, b times, with zero.");
      break;
  }
}



const calc = new Calculator();

console.log("Deno Calculator V1 - sovietbehemoth");


while (1) {
  const input = prompt(">");
  try {

    //prompt() will sometimes return null, these conditions handle that.


    if (input !== null) {
      if (input.startsWith("help")) {
        help_fn(input.split("help")[1]);
        continue;
      }
    }

    if (input === null || input === undefined) {
      console.error("Syntax, no input."); //calculate method only accepts string
      continue;
    }
    console.log(`${calc.calculate(input)}`);
  } catch (error) {
    console.error(error.message);
  }
}


export default Calculator;
