# Literature Survey

*(Owner: Krishna Patel — expands §6 of `Project_Documentation.pdf`)*

## Existing attendance solutions

| Existing Solution | Features | Limitations |
|---|---|---|
| Biometric Fingerprint | Accurate | Requires physical contact per student; queues during entry |
| RFID Card System | Fast | Cards can be lost, stolen, or shared (defeats the purpose) |
| Manual Roll Call | Simple, no hardware | Time-consuming, interrupts lecture time, prone to proxy attendance |

## Foundational techniques this project builds on

| Technique | Source | Relevance |
|---|---|---|
| Haar Cascade object detection | Viola & Jones, *Rapid Object Detection using a Boosted Cascade of Simple Features*, CVPR 2001 | The face-detection stage (`backend/vision/face_detection.py`) uses OpenCV's implementation of this classifier cascade. |
| Local Binary Patterns for face recognition | Ahonen, Hadid & Pietikäinen, *Face Description with Local Binary Patterns: Application to Face Recognition*, IEEE TPAMI 2006 | The feature-extraction stage (`backend/vision/lbp.py`) implements the LBP-histogram representation this line of work established as a lightweight, illumination-robust face descriptor. |

## How this project differs

Unlike fingerprint or RFID systems, this project is **fully contactless** —
students don't queue at a device. Unlike manual roll call, it's automated and
timestamped, removing proxy attendance. Compared to a deep-embedding approach
(FaceNet/dlib), using Haar Cascade + LBP keeps the dependency footprint small
enough to run identically across three different development machines without
a native-code build step (see `docs/image_processing_concepts.md`).
