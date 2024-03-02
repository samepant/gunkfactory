import { GunkUnits } from "../garments/garment";

export interface Measurement {
  name: string;
  description: string;
  bookId: number;
  referenceImage: string;
  value?: number;
}

export interface FullSloper {
  unit: GunkUnits;
  upperBody: {
    shoulderGirth: Measurement;
    chestGirth: Measurement;
    abdomenGirth: Measurement;
    waistGirth: Measurement;
    shoulderSeam: Measurement;
    halfFrontNeckline: Measurement;
    centerFrontNeckToShoulderTip: Measurement;
    halfFrontToMidArmhole: Measurement;
    halfFrontChest: Measurement;
    halfFrontAbdomen: Measurement;
    halfFrontWaist: Measurement;
    halfBackNeckline: Measurement;
    centerBackNeckToShoulderTip: Measurement;
    halfBackToMidArmhole: Measurement;
    halfBackChest: Measurement;
    halfBackAbdomen: Measurement;
    halfBackWaist: Measurement;
    dartPlacement: Measurement;
    sideSeam: Measurement;
    highNeckToSideSeamFront: Measurement;
    highNeckToSideSeamBack: Measurement;
    centerFront: Measurement;
    fullFront: Measurement;
    highNeckToChestFront: Measurement;
    shoulderTipToCenterWaistFront: Measurement;
    centerBack: Measurement;
    fullBack: Measurement;
    shoulderTipToCenterWaistBack: Measurement;
  };

  arm: {
    armLength: Measurement;
    underArmLength: Measurement;
    forearmLength: Measurement;
    bicepGirth: Measurement;
    elbowGirth: Measurement;
    wristGirth: Measurement;
    handGirth: Measurement;
  };

  lowerBody: {
    hipGirth: Measurement;
    hipHeightFront: Measurement;
    hipHeightSide: Measurement;
    hipHeightBack: Measurement;
    halfFrontHip: Measurement;
    halfBackHip: Measurement;
    outseamToFloor: Measurement;
    inseamToFloor: Measurement;
    crotchDepth: Measurement;
    outseamToAnkle: Measurement;
    inseamToAnkle: Measurement;
    crotchLength: Measurement;
    thighGirth: Measurement;
    calfGirth: Measurement;
    waistToKnee: Measurement;
    kneeToAnkle: Measurement;
    ankleGirth: Measurement;
    footGirth: Measurement;
  };
}
