import cv2
import numpy as np

# Load dummy or sample image
img = np.zeros((300, 300, 3), dtype=np.uint8)
cv2.putText(img, 'CG & IP Pipeline OK', (20, 150),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

# Apply a basic baseline operation
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 100, 200)

# Display to confirm GUI window rendering
cv2.imshow('Pipeline Test', edges)
cv2.waitKey(0)
cv2.destroyAllWindows()
