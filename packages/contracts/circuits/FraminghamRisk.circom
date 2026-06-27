pragma circom 2.0.0;

include "../circomlib_bundled/circuits/comparators.circom";

/// Simplified integer risk (pre-division) matching Prompt 03 weights.
/// ``risk = age*2 + systolicBP*3 + cholesterol - hdl*2 + ldl + bmi*2 + flags`` then ``riskScore = risk / 100`` off-template.
template FraminghamRisk() {
    signal input age;
    signal input systolicBP;
    signal input cholesterol;
    signal input hdl;
    signal input ldl;
    signal input bmi;
    signal input isSmoker;
    signal input isDiabetic;
    signal input hasFamilyHistory;

    signal output risk;

    signal risk_lin;
    risk_lin <== age * 2
        + systolicBP * 3
        + cholesterol
        + ldl
        + bmi * 2
        + isSmoker * 500
        + isDiabetic * 300
        + hasFamilyHistory * 200;

    signal hdl2;
    hdl2 <== hdl * 2;

    component ge = GreaterEqThan(20);
    ge.in[0] <== risk_lin;
    ge.in[1] <== hdl2;
    ge.out === 1;

    risk <== risk_lin - hdl2;
}
