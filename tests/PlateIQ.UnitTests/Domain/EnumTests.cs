namespace PlateIQ.UnitTests.Domain;

using FluentAssertions;
using PlateIQ.Core.Domain.Enums;

public class EnumTests
{
    [Theory]
    [InlineData(SetType.Warmup)]
    [InlineData(SetType.Main)]
    [InlineData(SetType.AMRAP)]
    [InlineData(SetType.Joker)]
    [InlineData(SetType.FSL)]
    [InlineData(SetType.BBB)]
    [InlineData(SetType.Accessory)]
    public void SetType_AllValues_AreDefined(SetType setType)
    {
        Enum.IsDefined(setType).Should().BeTrue();
    }

    [Fact]
    public void SetType_HasExpectedCount()
    {
        Enum.GetValues<SetType>().Should().HaveCount(7);
    }
}
