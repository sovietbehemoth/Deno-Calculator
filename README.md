# Deno-Calculator
A Calculator CLI built with Deno. 



Uses the order of operations (PEMDAS). The implemented order of operations is as follows.
1. Parenthesis
2. Function calls.
3. Exponents.
4. Multiplication.
5. Division.
6. Addition.
7. Subtraction.
8. Equality checking.

(variables such as PI or E are evaluated before, they don't affect the order of operations because they are static)

Has basic functions such as cos, tan, sqrt.

Function calls can be formatted in one of the following methods.
1. `sqrt 16`
2. `sqrt(16)`
3. `(sqrt 16)`
All 3 methods produce the same result.

Some functions will require more than one argument. ex: random, logBASE.
They should be formatted with their arguments separated by the comma operator.
ex: `random 0, 10`

The calculator also implements an equality checking operator (=). The operator will determine if the rvalue
and lvalue are equal and evaluate to 1 on true and 0 on false. It carries the lowest precedence in the order
of operations.

example coin flip implementation: `(random 1, 2) = 1`
