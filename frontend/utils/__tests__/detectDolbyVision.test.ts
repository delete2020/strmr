import { hasDolbyVisionTag } from '../detectDolbyVision';

describe('hasDolbyVisionTag', () => {
  it('identifies explicit Dolby Vision tags', () => {
    expect(hasDolbyVisionTag('Furiosa.2024.2160p.WEB-DL.DOLBY.VISION.DV.HDR.Atmos.mkv')).toBe(true);
    expect(hasDolbyVisionTag('Movie.2023.2160p.WEB-DL.DoVi.Atmos.x265.mkv')).toBe(true);
    expect(hasDolbyVisionTag('Video stream: HEVC HDR DV / English Dolby Atmos')).toBe(true);
  });

  it('ignores releases without Dolby Vision markers', () => {
    expect(hasDolbyVisionTag('Movie.2023.1080p.WEB.H264.DD5.1.mkv')).toBe(false);
    expect(hasDolbyVisionTag('Classic.2005.DVDRip.XviD')).toBe(false);
  });

  it('supports multiple candidates', () => {
    expect(
      hasDolbyVisionTag('Series.S01E01.2160p.WEB.HDR10Plus.x265', 'Series.S01E01.2160p.WEB.DV.HDR10Plus.x265'),
    ).toBe(true);

    expect(hasDolbyVisionTag(undefined, null, 'Standard 1080p BluRay')).toBe(false);
  });
});
