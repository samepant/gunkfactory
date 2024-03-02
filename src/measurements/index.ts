import { FullSloper } from "./measurement";

export const emptySloper: FullSloper = {
  unit: "cm",
  upperBody: {
    shoulderGirth: {
      name: "Shoulder Girth",
      description:
        "Measure all the way around the upper arms and body with a tape measure, keeping it parallel to the floor.",
      referenceImage: "ref_1.png",
      bookId: 1,
    },
    chestGirth: {
      name: "Chest Girth",
      description:
        "Measure all the way around the largest circumference of the chest with a tape measure, keeping it parallel to the floor.",
      referenceImage: "ref_2_3_4.png",
      bookId: 2,
    },
    abdomenGirth: {
      name: "Abdomen Girth",
      description:
        "Measure all the way around the largest circumference of the abdomen (usually at the belly button level on a live model) with a tape measure, parallel to the floor.",
      referenceImage: "ref_2_3_4.png",
      bookId: 3,
    },
    waistGirth: {
      name: "Waist Girth",
      description:
        "Measure all the way around the smallest circumference of the torso at the natural waist.",
      referenceImage: "ref_2_3_4.png",
      bookId: 4,
    },
    shoulderSeam: {
      name: "Shoulder Seam",
      description:
        "Measure from the high neck point to the shoulder tip/armhole intersection along the top of the shoulder.",
      referenceImage: "ref_5.png",
      bookId: 5,
    },
    halfFrontNeckline: {
      name: "Half Front Neckline",
      description:
        "Measure from the high neck point around to the pit of the neck.",
      referenceImage: "ref_6.png",
      bookId: 6,
    },
    centerFrontNeckToShoulderTip: {
      name: "Center Front Neck to Shoulder Tip",
      description: "Measure from the pit of the neck to the shoulder tip.",
      referenceImage: "ref_7_8_9_10_11.png",
      bookId: 7,
    },
    halfFrontToMidArmhole: {
      name: "Half Front to Mid Armhole",
      description:
        "Measure from center front to the mid-arm-hole point at the pin.",
      referenceImage: "ref_7_8_9_10_11.png",
      bookId: 8,
    },
    halfFrontChest: {
      name: "Half Front Chest",
      description:
        "Measure from center front along the chest level to the side seam, parallel to the floor.",
      referenceImage: "ref_7_8_9_10_11.png",
      bookId: 9,
    },
    halfFrontAbdomen: {
      name: "Half Front Abdomen",
      description:
        "Measure from center front along the abdomen level to the side seam, parallel to the floor.",
      referenceImage: "ref_7_8_9_10_11.png",
      bookId: 10,
    },
    halfFrontWaist: {
      name: "Half Front Waist",
      description:
        "Measure from center front waist over to the side seam/waist intersection.",
      referenceImage: "ref_7_8_9_10_11.png",
      bookId: 11,
    },
    halfBackNeckline: {
      name: "Half Back Neckline",
      description:
        "Measure from the high neck point around to the center back neck.",
      referenceImage: "ref_12.png",
      bookId: 12,
    },
    centerBackNeckToShoulderTip: {
      name: "Center Back Neck to Shoulder Tip",
      description: "Measure from the center back neck to the shoulder tip.",
      referenceImage: "ref_13_14_15_16_17.png",
      bookId: 13,
    },
    halfBackToMidArmhole: {
      name: "Half Back to Mid Armhole",
      description:
        "The shoulder blade level is found using one fourth of the center back measurement from the neckline to the waistline. Using the one-fourth measurement, measure down from the neck, and mark at center back for the shoulder blade level. Obtain the 'halfway across shoulder blades' measurement by measuring from center back to the edge of the armhole plate or the pin.",
      referenceImage: "ref_13_14_15_16_17.png",
      bookId: 14,
    },
    halfBackChest: {
      name: "Half Back Chest",
      description:
        "Measure from center back to the side seam along the chest level, parallel to the floor.",
      referenceImage: "ref_13_14_15_16_17.png",
      bookId: 15,
    },
    halfBackAbdomen: {
      name: "Half Back Abdomen",
      description:
        "Measure from center back along the abdomen level to the side seam, parallel to the floor.",
      referenceImage: "ref_13_14_15_16_17.png",
      bookId: 16,
    },
    halfBackWaist: {
      name: "Half Back Waist",
      description:
        "Measure from center back waist over to the side seam/waist intersection.",
      referenceImage: "ref_13_14_15_16_17.png",
      bookId: 17,
    },
    dartPlacement: {
      name: "Dart Placement",
      description:
        "Measure from center back waist over to the side seam/waist intersection, divide by 2, and add ½ inch.",
      referenceImage: "ref_19_18.png",
      bookId: 18,
    },
    sideSeam: {
      name: "Side Seam",
      description:
        "Measure from the pin placed 1 inch below the armhole plate down to the side seam/waist intersection.",
      referenceImage: "ref_19_18.png",
      bookId: 19,
    },
    highNeckToSideSeamFront: {
      name: "High Neck to Side Seam Front",
      description:
        "Measure from the high neck point down the front to the underarm/side seam inter-section, which is marked with a pin.",
      referenceImage: "ref_20.png",
      bookId: 20,
    },
    highNeckToSideSeamBack: {
      name: "High Neck to Side Seam Back",
      description:
        "Measure from the high neck point down the back to the underarm/side seam inter-section, which is marked with a pin.",
      referenceImage: "ref_21.png",
      bookId: 21,
    },
    centerFront: {
      name: "Center Front",
      description:
        "Measure from the pit of the neck down the front to the waist. Do not curve the tape measure in under the abdomen.",
      referenceImage: "ref_23_22.png",
      bookId: 22,
    },
    fullFront: {
      name: "Full Front",
      description:
        "Measure from the high neck point over the chest down to the front waist. Do not curve the tape measure in under the abdomen.",
      referenceImage: "ref_23_22.png",
      bookId: 23,
    },
    highNeckToChestFront: {
      name: "High Neck to Chest Front",
      description: "Measure from the high neck point to the chest level.",
      referenceImage: "ref_24_25.png",
      bookId: 24,
    },
    shoulderTipToCenterWaistFront: {
      name: "Shoulder Tip to Center Waist Front",
      description:
        "Measure from the shoulder tip, over the chest and down to the center front waist. Do not curve the tape measure in under the abdomen.",
      referenceImage: "ref_24_25.png",
      bookId: 25,
    },
    centerBack: {
      name: "Center Back",
      description: "Measure from the back neck down to the waist.",
      referenceImage: "ref_26_27_28.png",
      bookId: 26,
    },
    fullBack: {
      name: "Full Back",
      description:
        "Measure from the high neck point, down the back, and to the waist.",
      referenceImage: "ref_26_27_28.png",
      bookId: 27,
    },
    shoulderTipToCenterWaistBack: {
      name: "Shoulder Tip to Center Waist Back",
      description:
        "Measure from the shoulder tip, down the back, and to the center back waist.",
      referenceImage: "ref_26_27_28.png",
      bookId: 28,
    },
  },
  arm: {
    armLength: {
      name: "Arm Length",
      description:
        "Measure from the shoulder tip down the arm and around the elbow tip to just below the wrist bone while the arm is hanging naturally, slightly bent.",
      referenceImage: "ref_29.png",
      bookId: 29,
    },
    underArmLength: {
      name: "Under Arm Length",
      description:
        "Measure from the pin that is 4 inch below the model's underarm to just below the wrist bone while the arm is held straight.",
      referenceImage: "ref_30.png",
      bookId: 30,
    },
    forearmLength: {
      name: "Forearm Length",
      description:
        "Measure from just below the wrist bone up to the elbow tip while the arm is bent.",
      referenceImage: "ref_31.png",
      bookId: 31,
    },
    bicepGirth: {
      name: "Bicep Girth",
      description:
        "Measure at the largest circumference-high up under the arm while the biceps muscle is flexed, which will enlarge the cir-cumference.",
      referenceImage: "ref_32.png",
      bookId: 32,
    },
    elbowGirth: {
      name: "Elbow Girth",
      description:
        "Measure the elbow at the widest part while the arm is bent.",
      referenceImage: "ref_33.png",
      bookId: 33,
    },
    wristGirth: {
      name: "Wrist Girth",
      description: "Measure around the wrist joint.",
      referenceImage: "ref_34.png",
      bookId: 34,
    },
    handGirth: {
      name: "Hand Girth",
      description: "Measure around the hand at the largest circumference.",
      referenceImage: "ref_35.png",
      bookId: 35,
    },
  },
  lowerBody: {
    hipGirth: {
      name: "Hip Girth",
      description:
        "Measure completely around the largest circumference of the hips and buttocks, keeping the tape measure parallel to the floor.",
      referenceImage: "ref_36_37.png",
      bookId: 36,
    },
    hipHeightFront: {
      name: "Hip Height Front",
      description:
        "Measure from center front waist level down to the hip level.",
      referenceImage: "ref_36_37.png",
      bookId: 37,
    },
    hipHeightSide: {
      name: "Hip Height Side",
      description:
        "Measure from the side/waist down to the hip level along the side seam.",
      referenceImage: "ref_38_39.png",
      bookId: 38,
    },
    hipHeightBack: {
      name: "Hip Height Back",
      description:
        "Measure from center back waist level down to the hip level.",
      referenceImage: "ref_38_39.png",
      bookId: 39,
    },
    halfFrontHip: {
      name: "Half Front Hip",
      description:
        "Measure from center front over to the side seam at the hip level.",
      referenceImage: "ref_40.png",
      bookId: 40,
    },
    halfBackHip: {
      name: "Half Back Hip",
      description:
        "Measure from center back over to the side seam at the hip level.",
      referenceImage: "ref_41.png",
      bookId: 41,
    },
    outseamToFloor: {
      name: "Outseam to Floor",
      description:
        "Measure from the side/waist along the side seam to the floor. Remember that if you are using a live model, they should not be wearing any shoes.",
      referenceImage: "ref_42_43_44.png",
      bookId: 42,
    },
    inseamToFloor: {
      name: "Inseam to Floor",
      description:
        "Measure from the center of the crotch straight down to the floor. Again, the live model should not be wearing any shoes.",
      referenceImage: "ref_42_43_44.png",
      bookId: 43,
    },
    crotchDepth: {
      name: "Crotch Depth",
      description:
        "To determine the crotch depth, find the difference between #42 and #43, which gives you #44. To check this measurement on a live model, have him sit up straight on a flat surface, and measure from the surface (at his crotch level) up to his waist level along his side seam.",
      referenceImage: "ref_42_43_44.png",
      bookId: 44,
    },
    outseamToAnkle: {
      name: "Outseam to Ankle",
      description:
        "Measure from the side/waist down to just above the ankle bone.",
      referenceImage: "ref_45_46.png",
      bookId: 45,
    },
    inseamToAnkle: {
      name: "Inseam to Ankle",
      description:
        "Measure from the center of the crotch down the inner leg to just above the ankle bone.",
      referenceImage: "ref_45_46.png",
      bookId: 46,
    },
    crotchLength: {
      name: "Crotch Length",
      description:
        "Measure from center front waist down between the legs and up to center back waist. Do not pull tightly between the buttocks.",
      referenceImage: "ref_47.png",
      bookId: 47,
    },
    thighGirth: {
      name: "Thigh Girth",
      description:
        "Measure completely around the largest circumference of the upper thigh.",
      referenceImage: "ref_48_49_50_51_52.png",
      bookId: 48,
    },
    calfGirth: {
      name: "Calf Girth",
      description:
        "Measure completely around the largest circumference of the upper calf.",
      referenceImage: "ref_48_49_50_51_52.png",
      bookId: 49,
    },
    waistToKnee: {
      name: "Waist to Knee",
      description:
        "Measure from the side/waist down to the middle of the knee.",
      referenceImage: "ref_48_49_50_51_52.png",
      bookId: 50,
    },
    kneeToAnkle: {
      name: "Knee to Ankle",
      description:
        "Measure from the middle of the knee down to just above the ankle bone.",
      referenceImage: "ref_48_49_50_51_52.png",
      bookId: 51,
    },
    ankleGirth: {
      name: "Ankle Girth",
      description:
        "Measure completely around the smallest circumference of the ankle just above the ankle bone.",
      referenceImage: "ref_48_49_50_51_52.png",
      bookId: 52,
    },
    footGirth: {
      name: "Foot Girth",
      description:
        "Have the model point his toes so you can measure around the widest part of his heel.",
      referenceImage: "ref_53.png",
      bookId: 53,
    },
  },
};
