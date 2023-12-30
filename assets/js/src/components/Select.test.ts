import uFuzzy from "@leeoniya/ufuzzy";

describe("test select", () => {
  test("should filter", () => {
    const items = ["dpmpp_2", "FileTest_a2"];
    const u = new uFuzzy({
      intraMode: 1,
      intraIns: 1,
      //   sort: typeAheadSort,
      intraChars: ".",
      interChars: ".",
      intraSub: 1,
      intraTrn: 1,
      intraDel: 1,
    });

    const haystack = items;
    u.search;
    const idxs = u.filter(haystack, "filetesta2");
    console.log(idxs);
    // const info = u.info(idxs ?? [], haystack, search);
    expect(idxs).toHaveLength(1);
  });
});
