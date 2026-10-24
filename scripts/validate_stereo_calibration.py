#!/usr/bin/env python3
"""Validate SutureHero stereo capture exports offline (pip install opencv-python numpy).

Usage: python scripts/validate_stereo_calibration.py captures.json
Exits nonzero unless a trustworthy calibration exists; does not alter live tracking.
"""
import sys, json, base64
import cv2
import numpy as np

def corners(item, pattern):
    image = cv2.imdecode(np.frombuffer(base64.b64decode(item["image"].split(",")[-1]), np.uint8), cv2.IMREAD_GRAYSCALE)
    if image is None: return None
    half = cv2.resize(image, (image.shape[1]//2, image.shape[0]//2))
    ok, pts = cv2.findChessboardCornersSB(half, pattern, flags=cv2.CALIB_CB_EXHAUSTIVE | cv2.CALIB_CB_ACCURACY)
    return pts * 2 if ok else None

def main(path):
    data = json.load(open(path, encoding="utf8"))
    board = data["board"]
    pattern = (board["innerCornersX"], board["innerCornersY"])
    obj = np.zeros((pattern[0]*pattern[1], 3), np.float32)
    obj[:,:2] = np.mgrid[0:pattern[0],0:pattern[1]].T.reshape(-1,2) * board["squareSizeMm"]
    good, bad = [], []
    for i, pair in enumerate(data["pairs"], 1):
        a, b = corners(pair["first"],pattern), corners(pair["second"],pattern)
        if a is None or b is None: bad.append(i)
        else: good.append((a,b))
    report = {"totalPairs":len(data["pairs"]), "detectedPairs":len(good), "undetectedPairs":bad, "accepted":False}
    if len(good)>=8:
        image_size=(data["pairs"][0]["first"]["width"],data["pairs"][0]["first"]["height"])
        report["intrinsics"]=[]
        for cam in range(2):
            rms,K,D,_,_=cv2.calibrateCamera([obj]*len(good),[pair[cam] for pair in good],image_size,None,None,flags=cv2.CALIB_FIX_K3|cv2.CALIB_ZERO_TANGENT_DIST)
            fx,fy,cx,cy=K[0,0],K[1,1],K[0,2],K[1,2]
            plausible=bool(np.isfinite(K).all() and .3*image_size[0]<fx<5*image_size[0] and .3*image_size[1]<fy<5*image_size[1] and 0<=cx<=image_size[0] and 0<=cy<=image_size[1] and abs(fx/fy-1)<.25 and rms<2)
            report["intrinsics"].append({"camera":cam+1,"rmsPixels":float(rms),"fx":float(fx),"fy":float(fy),"cx":float(cx),"cy":float(cy),"plausible":plausible})
    report["reason"]="Stereo corner orientation and reprojection validation not yet implemented; do not use for 3D tracking"
    print(json.dumps(report,indent=2))
    return 2

if __name__=="__main__":
    sys.exit(main(sys.argv[1]))
