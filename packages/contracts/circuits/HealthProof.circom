pragma circom 2.0.0;

include "../circomlib_bundled/circuits/poseidon.circom";
include "../circomlib_bundled/circuits/comparators.circom";
include "../circomlib_bundled/circuits/bitify.circom";

include "RangeProof.circom";
include "FraminghamRisk.circom";

/// CardioVault health proof: private vitals + Poseidon commitment + bounded risk vs public ``maxRiskScore``.
template HealthProof() {
    // Public inputs (Groth16): order must match snarkjs publicSignals
    signal input maxRiskScore;
    signal input commitment;

    // Private inputs
    signal input age;
    signal input systolicBP;
    signal input diastolicBP;
    signal input cholesterol;
    signal input hdl;
    signal input ldl;
    signal input bmi;
    signal input isSmoker;
    signal input isDiabetic;
    signal input hasFamilyHistory;
    signal input salt;

    signal output isValid;

    // Bind public max risk to 16 bits (score comparison domain)
    component maxBits = Num2Bits(16);
    maxBits.in <== maxRiskScore;

    // Bind salt to avoid pathological field overflow in witness
    component saltBits = Num2Bits(252);
    saltBits.in <== salt;

    // --- Range checks (medically plausible bounds) ---
    component rp_age = RangeProof(16);
    rp_age.in <== age;
    rp_age.lower <== 18;
    rp_age.upper <== 121;

    component rp_sys = RangeProof(16);
    rp_sys.in <== systolicBP;
    rp_sys.lower <== 70;
    rp_sys.upper <== 251;

    component rp_dia = RangeProof(16);
    rp_dia.in <== diastolicBP;
    rp_dia.lower <== 40;
    rp_dia.upper <== 151;

    component rp_chol = RangeProof(16);
    rp_chol.in <== cholesterol;
    rp_chol.lower <== 100;
    rp_chol.upper <== 601;

    component rp_hdl = RangeProof(16);
    rp_hdl.in <== hdl;
    rp_hdl.lower <== 10;
    rp_hdl.upper <== 201;

    component rp_ldl = RangeProof(16);
    rp_ldl.in <== ldl;
    rp_ldl.lower <== 20;
    rp_ldl.upper <== 401;

    component rp_bmi = RangeProof(16);
    rp_bmi.in <== bmi;
    rp_bmi.lower <== 100;
    rp_bmi.upper <== 601;

    component rp_smoke = RangeProof(2);
    rp_smoke.in <== isSmoker;
    rp_smoke.lower <== 0;
    rp_smoke.upper <== 2;

    component rp_diab = RangeProof(2);
    rp_diab.in <== isDiabetic;
    rp_diab.lower <== 0;
    rp_diab.upper <== 2;

    component rp_fam = RangeProof(2);
    rp_fam.in <== hasFamilyHistory;
    rp_fam.lower <== 0;
    rp_fam.upper <== 2;

    // --- Poseidon commitment over all private fields (field elements) ---
    component hasher = Poseidon(11);
    hasher.inputs[0] <== age;
    hasher.inputs[1] <== systolicBP;
    hasher.inputs[2] <== diastolicBP;
    hasher.inputs[3] <== cholesterol;
    hasher.inputs[4] <== hdl;
    hasher.inputs[5] <== ldl;
    hasher.inputs[6] <== bmi;
    hasher.inputs[7] <== isSmoker;
    hasher.inputs[8] <== isDiabetic;
    hasher.inputs[9] <== hasFamilyHistory;
    hasher.inputs[10] <== salt;

    hasher.out === commitment;

    // --- Risk score (integer division by 100) ---
    component fr = FraminghamRisk();
    fr.age <== age;
    fr.systolicBP <== systolicBP;
    fr.cholesterol <== cholesterol;
    fr.hdl <== hdl;
    fr.ldl <== ldl;
    fr.bmi <== bmi;
    fr.isSmoker <== isSmoker;
    fr.isDiabetic <== isDiabetic;
    fr.hasFamilyHistory <== hasFamilyHistory;

    signal riskScore;
    signal rem;

    riskScore <-- fr.risk \ 100;
    rem <== fr.risk - riskScore * 100;

    component remLt = LessThan(8);
    remLt.in[0] <== rem;
    remLt.in[1] <== 100;
    remLt.out === 1;

    fr.risk === riskScore * 100 + rem;

    component rsBound = LessThan(12);
    rsBound.in[0] <== riskScore;
    rsBound.in[1] <== 1024;
    rsBound.out === 1;

    component le = LessEqThan(16);
    le.in[0] <== riskScore;
    le.in[1] <== maxRiskScore;
    le.out === 1;

    isValid <== 1;
}

component main {public [maxRiskScore, commitment]} = HealthProof();
