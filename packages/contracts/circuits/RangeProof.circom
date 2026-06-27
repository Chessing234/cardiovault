pragma circom 2.0.0;

include "../circomlib_bundled/circuits/bitify.circom";
include "../circomlib_bundled/circuits/comparators.circom";

/// Prove ``lower <= in < upper`` with ``in`` constrained to ``bits`` bits.
template RangeProof(bits) {
    signal input in;
    signal input lower;
    signal input upper;
    signal output valid;

    component n2b = Num2Bits(bits);
    n2b.in <== in;

    component lt = LessThan(bits);
    lt.in[0] <== in;
    lt.in[1] <== upper;

    component gte = GreaterEqThan(bits);
    gte.in[0] <== in;
    gte.in[1] <== lower;

    valid <== lt.out * gte.out;
    valid === 1;
}
