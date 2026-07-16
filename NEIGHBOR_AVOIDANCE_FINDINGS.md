# Direct-Neighbor Avoidance Strategy Evaluation

## Task Context
Issue: https://github.com/alt-ctrl-dev/mosaic-maker/issues/3
Parent PRD: https://github.com/alt-ctrl-dev/mosaic-maker/issues/1

This document records the findings from the visual prototype evaluation of direct-neighbor avoidance strategies for the Mosaic Maker application.

## Evaluation Setup
The prototype compared four neighbor avoidance strategies using representative source images and tesserae collections:

1. **No neighbor avoidance** (unrestricted best match) - Always select the tessera with the best color match
2. **10% tolerance** - Avoid direct neighbors when an alternative tessera is within 10% of the best match score
3. **5% tolerance** - Avoid direct neighbors when an alternative tessera is within 5% of the best match score
4. **Adaptive tolerance** - Variable tolerance based on source image complexity

## Key Observations

### Visual Quality Improvements
- **Unrestricted matching** creates visible clusters and repetition in uniform regions (sky, walls, solid colors)
- **10% tolerance** significantly reduces obvious repetition while maintaining color accuracy
- **5% tolerance** provides minimal improvement over unrestricted matching
- **Adaptive tolerance** offers good results in varied images but can be overly aggressive in uniform regions

### Representative Source Image Behaviors
1. **Gradient regions** (sky transitions):
   - Unrestricted: Creates visible bands of repeated tesserae
   - With avoidance: Much smoother visual transitions, improved aesthetic appeal

2. **Solid color regions** (walls, backgrounds):
   - Unrestricted: Large blocks of identical tesserae are visually jarring
   - With avoidance: Better variety while maintaining color accuracy

3. **Detailed regions** (textures, patterns):
   - Unrestricted: Best color accuracy preserved
   - With avoidance: Some loss of accuracy when excessive variety is prioritized

## Product Decision

### Selected Tolerance: **10% match-score tolerance**

#### Rationale:
1. **Significant visual improvement** in uniform regions without noticeable quality loss
2. **Minimal impact** on detailed regions where accuracy is paramount
3. **Good balance** between variety and fidelity
4. **Consistent with initial task specification** (10% was the starting point)

#### Implementation Guidance:
- Compare the best match score with alternative tesserae that are NOT direct neighbors
- If an alternative tessera scores within 10% of the best match, select it to avoid repetition
- Only apply avoidance when it doesn't significantly harm the color match quality
- Consider both the tessera directly above and directly to the left as neighbors to avoid

## Supporting Examples (from prototype)
The prototype demonstrated that in a solid red region:
- Unrestricted matching resulted in large contiguous blocks of the same red tessera
- 10% tolerance introduced variety (other tesserae) while maintaining the overall red appearance
- The visual improvement was substantial with no perceptible loss in color accuracy

In detailed pattern regions:
- Both approaches produced similar results as the color matching was the dominant factor
- Neighbor avoidance had minimal impact, which is the desired behavior

## Recommendation for Production Engine
Implement direct-neighbor avoidance using a 10% match-score tolerance threshold, checking both the tessera directly above and directly to the left as neighbors to avoid.

This strategy provides the best balance of visual variety in uniform regions while preserving color accuracy in detailed regions.

---

*This finding is based on the visual prototype evaluation and should inform the implementation of the matching engine in the production codebase.*