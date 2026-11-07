import base64
import unittest
import cv2
import numpy as np
from validate_stereo_calibration import object_points, solve_stereo, corners

BOARD = dict(squaresX=9, squaresY=7, innerCornersX=8, innerCornersY=6, squareSizeMm=16)

class StereoSolverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.obj = object_points(BOARD)
        cls.k1 = np.array([[1000.,0,640],[0,1002.,360],[0,0,1]])
        cls.k2 = np.array([[1600.,0,960],[0,1602.,540],[0,0,1]])
        cls.d = np.array([-.02,.001,.0002,-.0001,0.])
        cls.r = cv2.Rodrigues(np.array([.012,.025,-.01]))[0]; cls.t = np.array([[-160.],[1.],[2.]])
        cls.first, cls.second = [], []
        rng = np.random.default_rng(23)
        for i in range(20):
            rv = np.array([-.35+.7*(i%5)/4,-.3+.6*(i//5)/3,.15*np.sin(i)])
            r = cv2.Rodrigues(rv)[0]; t = np.array([[-90+100*np.sin(i*.8)],[-50+60*np.cos(i*.9)],[650+20*i]])
            a = cv2.projectPoints(cls.obj,rv,t,cls.k1,cls.d)[0]
            b = cv2.projectPoints(cls.obj,cv2.Rodrigues(cls.r@r)[0],cls.r@t+cls.t,cls.k2,cls.d)[0]
            a = (a+rng.normal(0,.025,a.shape)).astype(np.float32)
            b = (b+rng.normal(0,.025,b.shape)).astype(np.float32)
            cls.first.append(a); cls.second.append(b[::-1].copy() if i%3==0 else b)

    def test_metric_solution_and_corner_orientation(self):
        c = solve_stereo(BOARD,self.first,self.second,[(1280,720),(1920,1080)])
        self.assertTrue(c['validation']['accepted'])
        self.assertLess(abs(c['stereo']['baselineMm']-np.linalg.norm(self.t)),3)
        self.assertLess(c['stereo']['rmsPx'],.15)
        self.assertEqual(c['camera2']['imageSize']['width'],1920)
        bigger = solve_stereo({**BOARD,'squareSizeMm':24},self.first,self.second,[(1280,720),(1920,1080)])
        self.assertAlmostEqual(bigger['stereo']['baselineMm']/c['stereo']['baselineMm'],1.5,places=3)

    def test_reject_insufficient_or_mismatched_pairs(self):
        with self.assertRaises(ValueError): solve_stereo(BOARD,self.first[:5],self.second[:5],[(1280,720),(1920,1080)])
        bad = [b.copy() for b in self.second]; bad[4][:,:,0] += 60
        with self.assertRaises(ValueError): solve_stereo(BOARD,self.first,bad,[(1280,720),(1920,1080)])

    def test_detect_actual_checkerboard_image(self):
        image = np.full((720,1280),230,np.uint8)
        board = np.array([[0 if (x//60+y//60)%2==0 else 255 for x in range(540)] for y in range(420)],np.uint8)
        outer = np.array([[-16,-16,0],[128,-16,0],[128,96,0],[-16,96,0]],np.float32)
        target = cv2.projectPoints(outer,np.array([.2,-.25,.06]),np.array([-60.,-35.,650.]),self.k1,np.zeros(5))[0].reshape(-1,2).astype(np.float32)
        homography = cv2.getPerspectiveTransform(np.array([[0,0],[540,0],[540,420],[0,420]],np.float32),target)
        image = cv2.warpPerspective(board,homography,(1280,720),borderValue=230)
        encoded = base64.b64encode(cv2.imencode('.png',image)[1]).decode()
        detected = corners(dict(width=1280,height=720,image='data:image/png;base64,'+encoded),(8,6))
        self.assertIsNotNone(detected);self.assertEqual(detected.shape,(48,1,2))

if __name__ == '__main__': unittest.main()
